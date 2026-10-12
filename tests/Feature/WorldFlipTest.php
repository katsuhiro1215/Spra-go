<?php

use App\Models\ProfileWorldItem;
use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| 置いたアイテムの向きを左右に反転する(2026-10-13 Owner提案。反転は絵だけ。使うマスは変わらない)
|--------------------------------------------------------------------------
*/

function placedBenchFor(UserProfile $profile, int $x, int $y): ProfileWorldItem
{
    return $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => $x, 'y' => $y]);
}

it('置いたアイテムは、はじめは反転していない。API の一覧にも mirrored が出る', function () {
    $profile = createActiveProfile();
    placedBenchFor($profile, 5, 5);

    $items = $this->getJson('/api/world')->assertOk()->json('items');

    expect($items[0]['mirrored'])->toBeFalse();
});

it('反転すると mirrored が true になり、もう一度で false に戻る。位置は変わらない', function () {
    $profile = createActiveProfile();
    $bench = placedBenchFor($profile, 5, 5);

    $this->postJson("/api/world/items/{$bench->id}/flip")->assertOk()->assertJsonPath('mirrored', true)->assertJsonPath('x', 5)->assertJsonPath('y', 5);
    expect($bench->fresh()->mirrored)->toBeTrue();

    $this->postJson("/api/world/items/{$bench->id}/flip")->assertOk()->assertJsonPath('mirrored', false);
    expect($bench->fresh()->mirrored)->toBeFalse();
});

it('ほかの人のアイテムは反転できない(404)', function () {
    $mine = createActiveProfile();
    $other = createFamilyMember($mine, '別の子');
    $theirs = placedBenchFor($other, 5, 5);

    $this->postJson("/api/world/items/{$theirs->id}/flip")->assertNotFound();
    expect(ProfileWorldItem::find($theirs->id)->mirrored)->toBeFalse();
});

it('ログインしていないと反転できない', function () {
    $this->postJson('/api/world/items/1/flip')->assertUnauthorized();
});
