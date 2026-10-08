<?php

use App\Models\ProfileWorldItem;

/*
|--------------------------------------------------------------------------
| 置けなくなった物をバッグに戻す(docs/design/2026-10-07-town-sizes-design.md 4-4)
|--------------------------------------------------------------------------
|
| 建物の大きさが変わった・家が大きくなった・レベルが下がった、などで置けなくなった物を、消さずにバッグに戻す。
| 重なるときは、先に置いた(古い)物を残す。何度流しても同じ結果。
|
*/

function isPlacedNow(ProfileWorldItem $item): bool
{
    return $item->fresh()->isPlaced();
}

it('広がった建物と重なる物は、新しい物がバッグに戻る(先に置いた物が残る)', function () {
    $profile = createActiveProfile();
    $bench = createPlacedBench($profile, 6, 6);
    $mall = createBuilding($profile, 'spru_mall', 4, 4); // 3×3で (6,6) にかかる

    $this->artisan('world:repair')->assertSuccessful();

    expect(isPlacedNow($bench))->toBeTrue()->and(isPlacedNow($mall))->toBeFalse()
        ->and($mall->fresh()->x)->toBeNull()->and($mall->fresh()->y)->toBeNull();
});

it('家のマス・畑のマス・道のマスにある物は、バッグに戻る', function (int $x, int $y) {
    $profile = createActiveProfile();
    $item = createPlacedBench($profile, $x, $y);

    $this->artisan('world:repair')->assertSuccessful();

    expect(isPlacedNow($item))->toBeFalse();
})->with(['家の右' => [2, 1], '家の手前' => [2, 2], '畑' => [0, 2], '道' => [3, 2]]);

it('雲に隠れた区画・地図の外にある物は、バッグに戻る', function () {
    $profile = createActiveProfile();
    $cloud = createPlacedBench($profile, 8, 1); // 竹林(Lv.5)。Lv.1では雲
    $outside = createPlacedBench($profile, 17, 0);

    $this->artisan('world:repair')->assertSuccessful();

    expect(isPlacedNow($cloud))->toBeFalse()->and(isPlacedNow($outside))->toBeFalse();
});

it('置ける物は動かさない。バッグの中の物もそのまま。2回目は何も戻さない', function () {
    $profile = createActiveProfile();
    $kept = createPlacedBench($profile, 5, 5);
    $bag = createBuilding($profile, 'fountain');
    createPlacedBench($profile, 2, 2); // 家の下にある

    $this->artisan('world:repair')->expectsOutputToContain('1個')->assertSuccessful();
    $this->artisan('world:repair')->expectsOutputToContain('0個')->assertSuccessful();

    expect(isPlacedNow($kept))->toBeTrue()->and($kept->fresh()->only(['x', 'y']))->toBe(['x' => 5, 'y' => 5])
        ->and(isPlacedNow($bag))->toBeFalse()
        ->and(ProfileWorldItem::count())->toBe(3);
});

it('--dry-run は、戻す物を出すだけで、何も変えない', function () {
    $profile = createActiveProfile();
    $item = createPlacedBench($profile, 2, 1);

    $this->artisan('world:repair', ['--dry-run' => true])->expectsOutputToContain('1個')->assertSuccessful();

    expect(isPlacedNow($item))->toBeTrue();
});

it('子ども(プロフィール)ごとに調べる。ほかの子の置き物とは重ならない', function () {
    $profile = createActiveProfile();
    $other = createFamilyMember($profile);
    $mine = createPlacedBench($profile, 5, 5);
    $theirs = createPlacedBench($other, 5, 5); // 別の町なので、同じマスでよい

    $this->artisan('world:repair')->assertSuccessful();

    expect(isPlacedNow($mine))->toBeTrue()->and(isPlacedNow($theirs))->toBeTrue();
});

it('レベルが開く区画は、その子のレベルで調べる(Lv.5なら竹林の物は残る)', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 5]);
    $item = createPlacedBench($profile, 9, 1);

    $this->artisan('world:repair')->assertSuccessful();

    expect(isPlacedNow($item))->toBeTrue();
});
