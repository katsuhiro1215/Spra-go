<?php

use App\Models\ProfileWorldItem;
use App\Models\ShopItem;
use App\Models\UserProfile;
use App\Support\WorldPlacement;
use App\Support\WorldRepair;

/*
|--------------------------------------------------------------------------
| 長方形の建物(docs/design/2026-10-19-town-rect-design.md)
|--------------------------------------------------------------------------
|
| 大きさは、1つの数字(N×N)のほかに、[幅, 高さ] も書ける。幅は x の向き、高さは y の向き。
| 左右反転(mirrored)すると、幅と高さが入れ替わる(3×2 ⇄ 2×3)。footprint は、長いほうの辺。
|
*/

beforeEach(function () {
    config(['world.asset_footprints' => [...config('world.asset_footprints'), 'bakery' => [3, 2], 'cafe' => [2, 1]]]);
});

function benchAt(UserProfile $profile, int $x, int $y): ProfileWorldItem
{
    return $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => $x, 'y' => $y]);
}

function rectItem(UserProfile $profile, string $assetKey = 'bakery', ?int $x = null, ?int $y = null, bool $mirrored = false): ProfileWorldItem
{
    $shopItem = ShopItem::query()->where('type', 'decoration')->get()->first(fn ($i) => $i->assetKey() === $assetKey)
        ?? createDecoration(['name' => $assetKey, 'meta' => ['asset_key' => $assetKey]]);

    return $profile->worldItems()->create(['shop_item_id' => $shopItem->id, 'x' => $x, 'y' => $y, 'mirrored' => $mirrored]);
}

it('大きさは [幅, 高さ] でも書ける。footprint は長いほうの辺、数字だけの書き方は今までどおり正方形', function () {
    $bakery = createDecoration(['name' => 'パン屋', 'meta' => ['asset_key' => 'bakery']]);
    $fountain = createDecoration(['name' => '噴水', 'meta' => ['asset_key' => 'fountain']]);
    $bench = createDecoration();

    expect($bakery->size())->toBe([3, 2])->and($bakery->footprint())->toBe(3)
        ->and($fountain->size())->toBe([2, 2])->and($fountain->footprint())->toBe(2)
        ->and($bench->size())->toBe([1, 1])->and($bench->footprint())->toBe(1);
});

it('町のAPIの置き物は、いまの向きの幅 w・高さ h と、長いほうの辺 footprint を返す。反転すると入れ替わる', function () {
    $profile = createActiveProfile();
    rectItem($profile, 'bakery', 4, 5);
    rectItem($profile, 'cafe', 4, 1, true); // 2×1 を反転 → 1×2

    $items = collect($this->getJson('/api/world')->assertOk()->json('items'))->keyBy('asset_key');

    expect($items['bakery'])->toMatchArray(['w' => 3, 'h' => 2, 'footprint' => 3, 'mirrored' => false])
        ->and($items['cafe'])->toMatchArray(['w' => 1, 'h' => 2, 'footprint' => 2, 'mirrored' => true]);
});

it('置くマスは 幅×高さ。右と下にはみ出す形で、はみ出す先が道・雲・ほかの物なら置けない', function () {
    $profile = createActiveProfile();
    $bakery = rectItem($profile);

    // 3×2 を (4,4) に置くと、x=4〜6・y=4〜5。町の中におさまる
    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 4, 'y' => 4])->assertOk();
    expect(WorldPlacement::tiles(4, 4, 3, 2))->toBe([[4, 4], [5, 4], [6, 4], [4, 5], [5, 5], [6, 5]]);

    // 幅3は x=7(竹林の雲)にかかる・高さ2は y=3(道)にかかる
    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 5, 'y' => 4])->assertStatus(422)->assertJsonPath('message', 'まだ雲に隠れているよ。');
    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 4, 'y' => 2])->assertStatus(422)->assertJsonPath('message', 'そこには置けません。');
});

it('別の物と1マスでも重なると置けない。長方形どうしも、向きに合わせて調べる', function () {
    $profile = createActiveProfile();
    benchAt($profile, 6, 5);
    $bakery = rectItem($profile);

    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 4, 'y' => 4])->assertStatus(422)->assertJsonPath('message', 'そこにはもう置いてあります。');
    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 4, 'y' => 6])->assertStatus(422); // y=7 は海辺(雲)
});

it('反転すると、幅と高さが入れ替わる。置けないなら422で、向きは変わらない', function () {
    $profile = createActiveProfile();
    $bakery = rectItem($profile, 'bakery', 4, 4);

    // 3×2 → 2×3(x=4〜5・y=4〜6)。おさまる
    $this->postJson("/api/world/items/{$bakery->id}/flip")->assertOk()->assertJsonPath('mirrored', true)->assertJsonPath('w', 2)->assertJsonPath('h', 3);
    expect($bakery->fresh()->mirrored)->toBeTrue();

    // (4,5) の 2×3 は、y=7(海辺の雲)にかかるので、もとの向きでは置けるが、反転すると置けない
    $other = rectItem($profile, 'bakery', 4, 5);
    $this->postJson("/api/world/items/{$other->id}/flip")->assertStatus(422);
    expect($other->fresh()->mirrored)->toBeFalse();
});

it('反転で、ほかの物にぶつかるときも422', function () {
    $profile = createActiveProfile();
    benchAt($profile, 4, 6);
    $bakery = rectItem($profile, 'bakery', 4, 4); // 3×2 は y=4〜5。2×3 にすると y=6 にかかる

    $this->postJson("/api/world/items/{$bakery->id}/flip")->assertStatus(422)->assertJsonPath('message', 'ひっくり返すと、ほかの物や道にぶつかるよ。');
    expect($bakery->fresh()->mirrored)->toBeFalse();
});

it('バッグの中の物は、いつでも反転できる。正方形の物は、置いたままでも、いつでも反転できる', function () {
    $profile = createActiveProfile();
    $bag = rectItem($profile);
    $this->postJson("/api/world/items/{$bag->id}/flip")->assertOk()->assertJsonPath('w', 2)->assertJsonPath('h', 3);

    $fountain = rectItem($profile, 'fountain', 4, 4);
    $this->postJson("/api/world/items/{$fountain->id}/flip")->assertOk()->assertJsonPath('w', 2)->assertJsonPath('h', 2);
});

it('反転した状態で置くと、反転した大きさ(2×3)で調べる', function () {
    $profile = createActiveProfile();
    $bakery = rectItem($profile, 'bakery', null, null, true);

    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 4, 'y' => 4])->assertOk(); // 2×3: x=4〜5・y=4〜6
    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 5, 'y' => 4])->assertOk(); // x=5〜6
    $this->patchJson("/api/world/items/{$bakery->id}", ['x' => 6, 'y' => 4])->assertStatus(422); // x=7 は雲
});

it('引いた道は、長方形の置き物のマスには引けない', function () {
    $profile = createActiveProfile();
    rectItem($profile, 'bakery', 4, 4);

    $this->postJson('/api/world/roads', ['add' => [[6, 5]], 'remove' => []])->assertStatus(422);
    $this->postJson('/api/world/roads', ['add' => [[6, 6]], 'remove' => []])->assertOk();
});

it('world:repair は、いまの向きの大きさで調べる(反転した 2×3 が雲にかかれば戻す)', function () {
    $profile = createActiveProfile();
    rectItem($profile, 'bakery', 4, 5); // 3×2: y=5〜6 でおさまる
    $bad = rectItem($profile, 'bakery', 0, 5, true); // 2×3: y=5〜7 が、海辺の雲にかかる

    expect(WorldRepair::unplaceable($profile->fresh()))->toBe([$bad->id]);
});
