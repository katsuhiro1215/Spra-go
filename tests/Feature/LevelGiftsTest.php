<?php

use App\Models\ShopItem;
use App\Support\LevelGifts;

/*
|--------------------------------------------------------------------------
| 好きな名所を1つ選ぶ(docs/design/2026-10-08-town-growth-design.md 4-4)
|--------------------------------------------------------------------------
*/

function landmarkItem(string $name, string $assetKey, int $minLevel = 10): ShopItem
{
    return ShopItem::create([
        'type' => 'decoration', 'name' => $name, 'price' => 600, 'currency' => 'point',
        'min_level' => $minLevel, 'meta' => ['asset_key' => $assetKey],
    ]);
}

it('選べる回は Lv12・22・32…', function (int $level, array $expected) {
    expect(LevelGifts::levels($level))->toBe($expected);
})->with([
    'Lv11' => [11, []],
    'Lv12' => [12, [12]],
    'Lv21' => [21, [12]],
    'Lv22' => [22, [12, 22]],
    'Lv32' => [32, [12, 22, 32]],
]);

it('Lv12の候補は2×2までの名所、Lv22は3×3も、Lv32はすべて', function () {
    landmarkItem('金閣寺', 'kinkakuji');
    landmarkItem('お城', 'castle', 20);
    landmarkItem('噴水', 'fountain'); // 名所ではない(decor)

    expect(LevelGifts::candidates(12)->pluck('name')->all())->toBe(['金閣寺'])
        ->and(LevelGifts::candidates(22)->pluck('name')->sort()->values()->all())->toBe(['お城', '金閣寺'])
        ->and(LevelGifts::candidates(32)->pluck('name')->sort()->values()->all())->toBe(['お城', '金閣寺']);
});

it('届いた回の名所をえらぶと、ポイントを使わずバッグに入る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12, 'points' => 5]);
    $item = landmarkItem('金閣寺', 'kinkakuji');

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])
        ->assertOk()
        ->assertJsonPath('item.name', '金閣寺');

    expect($profile->fresh()->points)->toBe(5)
        ->and($profile->worldItems()->count())->toBe(1)
        ->and($profile->worldItems()->first()->x)->toBeNull();
});

it('レベルが足りない回は選べない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 11]);
    $item = landmarkItem('金閣寺', 'kinkakuji');

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])->assertStatus(422);
});

it('候補にない物は選べない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12]);
    $castle = landmarkItem('お城', 'castle', 20); // Lv12の候補は2×2まで

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $castle->id])->assertStatus(422);
});

it('同じ回は1回しか選べない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12]);
    $item = landmarkItem('金閣寺', 'kinkakuji');
    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])->assertOk();

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])->assertStatus(422);

    expect($profile->worldItems()->count())->toBe(1);
});

it('あとで選べる: 届いて選んでいない回が一覧に出る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 22]);
    landmarkItem('金閣寺', 'kinkakuji');
    $this->postJson('/api/world/gifts/12', ['shop_item_id' => ShopItem::first()->id])->assertOk();

    $this->getJson('/api/world/gifts')
        ->assertOk()
        ->assertJsonCount(1, 'pending')
        ->assertJsonPath('pending.0.level', 22);
});

it('町を開くと、選べる回があることがわかる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('gifts_pending', [12]);
});

it('1×1の物は名所の候補に入らない', function () {
    landmarkItem('金閣寺', 'kinkakuji');
    landmarkItem('鳥居', 'woodland_torii');
    config(['world.asset_categories.woodland_torii' => 'landmark']);

    expect(LevelGifts::candidates(12)->pluck('name')->all())->toBe(['金閣寺']);
});
