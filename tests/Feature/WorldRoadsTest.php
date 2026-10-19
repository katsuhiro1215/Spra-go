<?php

use App\Models\ProfileRoad;

/*
|--------------------------------------------------------------------------
| 町の道を自分で引く(docs/design/2026-10-19-town-roads-design.md 3・4章)
|--------------------------------------------------------------------------
|
| 引けるのは、開いた区画の陸のマスで、目印・アイテム・もとの道・自分の道がないところ。
| 消せるのは自分が引いた道だけ。追加も削除も、全部通るか全部通らないか。
|
*/

function postRoads($test, array $add = [], array $remove = [])
{
    return $test->postJson('/api/world/roads', ['add' => $add, 'remove' => $remove]);
}

it('引いた道は、町の paths・blocked・custom_paths に入る。もとの道だけは custom_paths に入らない', function () {
    createActiveProfile();

    postRoads($this, [[5, 5], [5, 6]])->assertOk()->assertJsonPath('custom_paths', [[5, 5], [5, 6]]);

    $land = $this->getJson('/api/world')->assertOk()->json('land');
    expect($land['paths'])->toContain([5, 5])->toContain([5, 6])->toContain([3, 3])
        ->and($land['blocked'])->toContain([5, 5])
        ->and($land['custom_paths'])->toBe([[5, 5], [5, 6]]);
});

it('引いた道の上には、アイテムを置けない。道を消せば置ける', function () {
    $profile = createActiveProfile();
    $bench = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);

    postRoads($this, [[5, 5]])->assertOk();
    $this->patchJson("/api/world/items/{$bench->id}", ['x' => 5, 'y' => 5])->assertStatus(422);

    postRoads($this, [], [[5, 5]])->assertOk();
    $this->patchJson("/api/world/items/{$bench->id}", ['x' => 5, 'y' => 5])->assertOk();
});

it('ほかの人の道は、見えない・消せない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    ProfileRoad::create(['user_profile_id' => $sister->id, 'x' => 5, 'y' => 5]);

    $this->getJson('/api/world')->assertJsonPath('land.custom_paths', []);
    postRoads($this, [], [[5, 5]])->assertStatus(422);
    expect(ProfileRoad::count())->toBe(1);
});

it('家族の町には、その人の引いた道が出る', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    ProfileRoad::create(['user_profile_id' => $sister->id, 'x' => 5, 'y' => 5]);

    $this->getJson("/api/family/{$sister->id}")->assertOk()
        ->assertJsonPath('land.custom_paths', [[5, 5]])
        ->assertJsonFragment(['paths' => $this->getJson("/api/family/{$sister->id}")->json('land.paths')]);
    expect($this->getJson("/api/family/{$sister->id}")->json('land.paths'))->toContain([5, 5]);
});

it('引けない場所は422で、何も変わらない(雲・外・海・目印・もとの道・アイテムの上・もう引いた道)', function (int $x, int $y) {
    $profile = createActiveProfile();
    $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => 5, 'y' => 1]);
    ProfileRoad::create(['user_profile_id' => $profile->id, 'x' => 6, 'y' => 6]);

    postRoads($this, [[4, 4], [$x, $y]])->assertStatus(422);

    expect(ProfileRoad::count())->toBe(1);
})->with([
    '雲の区画(竹林)' => [8, 2],
    '地図の外' => [32, 0],
    '目印(鳥居)' => [3, 0],
    '目印(家)' => [2, 2],
    'もとの道' => [3, 3],
    'アイテムの上' => [5, 1],
    'もう引いた道' => [6, 6],
]);

it('海のマスには引けない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 30]);

    postRoads($this, [[15, 0]])->assertStatus(422);
    postRoads($this, [[14, 14]])->assertStatus(422);
});

it('消せるのは自分が引いた道だけ。もとの道・引いていないマスは422で、何も変わらない', function () {
    createActiveProfile();
    postRoads($this, [[5, 5], [5, 6]])->assertOk();

    postRoads($this, [], [[5, 5], [3, 3]])->assertStatus(422);
    postRoads($this, [], [[5, 5], [4, 4]])->assertStatus(422);

    expect(ProfileRoad::count())->toBe(2);
    postRoads($this, [], [[5, 5]])->assertOk()->assertJsonPath('custom_paths', [[5, 6]]);
});

it('引く・消すを同時に送れる。ただし両方からっぽ・形の違うものは422', function () {
    createActiveProfile();
    postRoads($this, [[5, 5]])->assertOk();

    postRoads($this, [[5, 6]], [[5, 5]])->assertOk()->assertJsonPath('custom_paths', [[5, 6]]);
    postRoads($this)->assertStatus(422);
    postRoads($this, [[1]])->assertStatus(422);
    postRoads($this, [['a', 'b']])->assertStatus(422);
    postRoads($this, array_fill(0, 101, [5, 5]))->assertStatus(422);
});

it('同じマスを2回送っても、1つだけ引かれる(二重送信)', function () {
    createActiveProfile();

    postRoads($this, [[5, 5], [5, 5]])->assertOk()->assertJsonPath('custom_paths', [[5, 5]]);
    postRoads($this, [[5, 5]])->assertStatus(422);
    expect(ProfileRoad::count())->toBe(1);
});

it('引ける数には上限がある(設定の roads.max)', function () {
    config(['world.roads.max' => 3]);
    createActiveProfile();

    postRoads($this, [[4, 4], [5, 4], [6, 4]])->assertOk();
    postRoads($this, [[4, 5]])->assertStatus(422);
    postRoads($this, [[4, 5]], [[4, 4]])->assertOk(); // 消しながらなら、数は増えない
    expect(ProfileRoad::count())->toBe(3);
});

it('引いた道は、レベルが上がっても残り、道を引くことでコイン・経験値・ポイントは動かない', function () {
    $profile = createActiveProfile();
    $before = $profile->fresh()->only(['coins', 'xp', 'points']);

    postRoads($this, [[5, 5]])->assertOk();
    $profile->update(['level' => 10]);

    expect($this->getJson('/api/world')->json('land.custom_paths'))->toBe([[5, 5]])
        ->and($profile->fresh()->only(['coins', 'xp', 'points']))->toBe($before);
});

it('開いた区画(竹林)にも、レベルが足りれば引ける', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 5]);

    postRoads($this, [[8, 2]])->assertOk()->assertJsonPath('custom_paths', [[8, 2]]);
});

it('町の目印が動いて、引いた道が目印のマスにかかったら、world:repair が引いた道を消す(置き物と同じ。何度流しても同じ)', function () {
    $profile = createActiveProfile();
    postRoads($this, [[5, 5]])->assertOk();
    // いまは目印のマス(家(0,1)・畑(2,2))に、引いた道が残っている状態をつくる
    ProfileRoad::create(['user_profile_id' => $profile->id, 'x' => 0, 'y' => 1]);
    ProfileRoad::create(['user_profile_id' => $profile->id, 'x' => 2, 'y' => 2]);

    $dry = \App\Support\WorldRepair::roads(true);
    expect($dry[$profile->id])->toBe([[0, 1], [2, 2]])->and(ProfileRoad::count())->toBe(3);

    \App\Support\WorldRepair::roads();
    expect(ProfileRoad::query()->pluck('x', 'y')->all())->toBe([5 => 5])
        ->and(\App\Support\WorldRepair::roads())->toBe([]);
});
